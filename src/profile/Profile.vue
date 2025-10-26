<script setup lang="ts">
import {
    ContentWrapper,
    SectionHeader,
    LoadingDots,
    SectionedCard,
    KeyValueItem,
} from '@churchtools/styleguide';
import { computed, toRef } from 'vue';
import useMyGroups from '../composables/useMyGroups';
import useWikiPage from '../composables/useWikiPage';
import { mdToHtml } from '../utils/helper';
import {
    useDbFieldsQuery,
    mapViz,
    Person,
    useToasts,
    useCurrentUser,
    queryClient,
    usePermissions,
    useGroupTypes,
    useRoles,
} from '@churchtools/utils';
import {
    STARTPAGE_WIKIPAGE_ID,
    STARTPAGE_CATEGORY_ID,
    STARTPAGE_FOOTER_WIKIPAGE_ID,
    GROUP_TYPE_SHORTIES,
} from '../utils/config';
import GroupCard from './GroupCard.vue';
import {
    churchtoolsClient,
    errorHelper,
} from '@churchtools/churchtools-client';
import { sortBy } from 'lodash';

const { groupTypes, queryStatus } = useGroupTypes();
const { roles } = useRoles();
const rolesById = computed(() =>
    Object.fromEntries(roles.value.map((role) => [role.id, role]))
);
const { myGroups, isLoading } = useMyGroups();

const filteredGroupTypes = computed(() => {
    const gt = groupTypes.value.filter((groupType) =>
        GROUP_TYPE_SHORTIES.includes(groupType.shorty)
    );
    return gt
        .map((g) => {
            return {
                ...g,
                namePluralTranslated:
                    g.namePluralTranslated ?? g.nameTranslated,
                groups: myGroups.value
                    .filter(
                        (group) =>
                            rolesById.value[group.groupTypeRoleId]
                                .groupTypeId === g.id
                    )
                    .map((group) => {
                        return {
                            ...group,
                            group: {
                                ...group.group,
                                title: group.group.title,
                                showStatus: g.shorty === 'AB',
                            },
                        };
                    }),
            };
        })
        .filter((g) => g.groups.length > 0);
});

const { getWikiPage } = useWikiPage();
const { data: wikiPage } = getWikiPage(
    toRef(() => STARTPAGE_CATEGORY_ID),
    toRef(() => STARTPAGE_WIKIPAGE_ID)
);
const { data: wikiPageFooter } = getWikiPage(
    toRef(() => STARTPAGE_CATEGORY_ID),
    toRef(() => STARTPAGE_FOOTER_WIKIPAGE_ID)
);
const description = computed(() => mdToHtml(wikiPage.value?.text));
const footer = computed(() => mdToHtml(wikiPageFooter.value?.text));

const { globalPerm } = usePermissions();
const { successToast, errorToast } = useToasts();
const { personFields } = useDbFieldsQuery();
const currentUser = useCurrentUser();

const fields = computed(() => {
    const mapped = mapViz(
        {},
        personFields.value.filter((f) => {
            const secLevel =
                globalPerm.value?.churchdb?.['security level view own data'];
            if (secLevel?.length) {
                return (
                    f.securityLevel <= secLevel[0] &&
                    !f.hideInFrontend &&
                    ['f_address', 'f_church'].includes(
                        f.fieldCategory.internCode
                    ) &&
                    (f.isNewPersonField ||
                        ['firstName', 'lastName'].includes(f.key))
                );
            }
            return false;
        }),
        currentUser.person ?? {}
    );
    const editLevel =
        globalPerm.value?.churchdb?.['security level edit own data'];
    const fields = Object.values(mapped ?? {}).map((item): KeyValueItem => {
        return {
            type: 'key-value',
            viz: {
                ...item,
                field: {
                    ...item?.field,
                    nullable:
                        item?.field?.fieldType?.internCode === 'text' &&
                        item?.field?.key !== 'name'
                            ? true
                            : item?.field?.nullable,
                } as any,
            } as any,
            editable: editLevel
                ? item?.field.securityLevel <= editLevel[0]
                : false,
            context: 'Persönliche Daten',
            onSave: async (e) => {
                try {
                    await churchtoolsClient.patch<Person>(
                        `/persons/${currentUser.id}`,
                        e
                    );
                    queryClient.invalidateQueries({
                        queryKey: ['currentUser'],
                    });
                    successToast('Daten gespeichert');
                    return true;
                } catch (error) {
                    errorToast(errorHelper.getTranslatedErrorMessage(error));
                    return false;
                }
            },
        };
    });
    return sortBy(fields, [
        'viz.field.fieldCategory.internCode',
        'viz.field.sortKey',
    ]);
});
</script>
<template>
    <ContentWrapper max-width>
        <div class="max-w-p mb-10 pjta-markdown" v-html="description"></div>
        <div class="flex flex-col gap-8">
            <LoadingDots
                v-if="queryStatus === 'pending' || !currentUser.id"
                class="mt-10"
            />
            <template v-else>
                <SectionedCard title="Persönliche Daten" :items="fields" />
                <div v-for="type in filteredGroupTypes" :key="type.id">
                    <SectionHeader
                        :title="type.namePluralTranslated"
                        :note="type.description"
                    />
                    <LoadingDots v-if="isLoading" class="mt-5" />
                    <div v-else class="c-card__wrapper mt-4">
                        <GroupCard
                            v-for="group in type.groups"
                            :key="group.group.domainIdentifier!"
                            :gms="group"
                            :show-status="group.group.showStatus"
                        />
                    </div>
                </div>
            </template>
        </div>
        <div class="max-w-p mb-10 pjta-markdown" v-html="footer"></div>
    </ContentWrapper>
</template>
