<script setup lang="ts">
import {
    ContentWrapper,
    SectionHeader,
    LoadingDots,
    SectionedCard,
    KeyValueItem,
    InfoBox,
} from '@churchtools/styleguide';
import { computed, nextTick, onMounted, ref, toRef, watch } from 'vue';
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
    t,
} from '@churchtools/utils';
import {
    STARTPAGE_WIKIPAGE_ID,
    STARTPAGE_CATEGORY_ID,
    STARTPAGE_FOOTER_WIKIPAGE_ID,
    GROUP_TYPE_SHORTIES,
    GROUP_TYPE_SHORTIES_WITH_ACCEPT,
    GROUP_TYPE_SHORTIES_IF_ACCEPTED_GROUP,
    GROUP_TYPE_SHORTIES_AUTO_ACCEPTED,
    GROUP_TYPE_SHORTIES_WITH_ACCEPTANCE_FIELD
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
                                showStatus: GROUP_TYPE_SHORTIES_WITH_ACCEPTANCE_FIELD.includes(g.shorty),
                            },
                        };
                    }),
            };
        })
        .filter((g) => g.groups.length > 0);
});

const displayedGroupTypes = computed(() =>
    filteredGroupTypes.value.filter((type) =>
        !GROUP_TYPE_SHORTIES_IF_ACCEPTED_GROUP.includes(type.shorty) || hasAcceptedGroup.value
    )
);

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
const hasAcceptedGroup = computed(() => {
    return myGroups.value.some((group) => {
        const groupType = groupTypes.value.find(
            (gt) => gt.id === rolesById.value[group.groupTypeRoleId].groupTypeId
        );
        if (!groupType || !GROUP_TYPE_SHORTIES_WITH_ACCEPT.includes(groupType.shorty)) {
            return false;
        }
        // STAND wird automatisch als akzeptiert gezählt
        if (GROUP_TYPE_SHORTIES_AUTO_ACCEPTED.includes(groupType.shorty)) {
            return true;
        }
        // AB muss auf "abgesagt" geprüft werden
        if (GROUP_TYPE_SHORTIES_WITH_ACCEPTANCE_FIELD.includes(groupType.shorty)) {
            const isAbgesagt = group.fields?.some((f) => {
                const isAbgesagt = Array.isArray(f.value)
                    ? !!f.value.filter((v) => v.toLowerCase().includes('abgesagt'))
                          .length
                    : f.value?.toString().toLowerCase().includes('abgesagt');
                return isAbgesagt;
            });
            return !isAbgesagt;
        }
        return false;
    });
});
const showWarning = ref(false);
const initWarning = () => {
    if (hasAcceptedGroup.value) {
        showWarning.value = !!document.querySelector('.pjta-required');
    }
};
onMounted(() => {
    queryClient.invalidateQueries({ queryKey: ['myGroups'] });
    initWarning();
    setInterval(() => {
        initWarning();
    }, 500);
});
</script>
<template>
    <ContentWrapper max-width>
        <div v-if="showWarning" class="sticky top-0 bg-white z-10">
            <InfoBox
                icon="fas fa-octagon-exclamation"
                color="red"
                title="ACHTUNG! Es fehlen noch Daten"
                description="Bitte schaue unten nach roten Markierungen und fülle die benötigten Felder aus."
            />
        </div>
        <div class="max-w-p mb-10 pjta-markdown" v-html="description"></div>
        <div class="flex flex-col gap-8">
            <LoadingDots
                v-if="queryStatus === 'pending' || !currentUser.id"
                class="mt-10"
            />
            <template v-else>
                <SectionedCard title="Persönliche Daten" :items="fields" />
                <div v-for="type in displayedGroupTypes" :key="type.id">
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
